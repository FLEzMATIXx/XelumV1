import os
import secrets
import logging
import re
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, session
from dotenv import load_dotenv
from openai import OpenAI
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from authlib.integrations.flask_client import OAuth
from werkzeug.middleware.proxy_fix import ProxyFix
import requests

load_dotenv()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
# SQLite path: /tmp for Vercel (read-only FS), local file for dev
if os.getenv('VERCEL'):
    DB_PATH = 'sqlite:////tmp/site.db'
else:
    DB_PATH = 'sqlite:///site.db'

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = DB_PATH
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'home'

# MNN AI client
client = OpenAI(
    api_key=os.getenv("MNN_API_KEY"),
    base_url=os.getenv("MNN_BASE_URL"),
)
DEFAULT_MODEL = os.getenv("MNN_MODEL", "gpt-4o-mini")

# Available models
AVAILABLE_MODELS = [
    {"id": "grok-3-mini", 
     "name": "Grok-3 Mini",
     "desc": "Fast & witty, great for casual tasks"},
    {"id": "gemini-3.1-flash-lite-preview", 
     "name": "Gemini-3.1 Flash",
     "desc": "Lightning fast multimodal model"},
    {"id": "gpt-5.3-chat", 
     "name": "GPT-5.3 Chat",
     "desc": "Advanced reasoning & long context"},
    {"id": "gpt-5", 
     "name": "GPT-5",
     "desc": "Next-gen creativity & reasoning"},
    {"id": "gpt-4.1", 
     "name": "GPT-4.1",
     "desc": "Balanced performance & accuracy"},
    {"id": "gpt-4o", 
     "name": "GPT-4o",
     "desc": "Smart & versatile all-rounder"},
    {"id": "gpt-4o-mini", 
     "name": "GPT-4o Mini",
     "desc": "Fast & cheap everyday helper"},
]

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '').strip()
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '').strip()

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# =============================================================================
# DATABASE MODELS
# =============================================================================

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(120), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(120))
    nickname = db.Column(db.String(120))
    picture = db.Column(db.String(500))
    avatar_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    chats = db.relationship('Chat', backref='user', lazy=True, cascade='all, delete-orphan')


class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), default='New Chat')
    model = db.Column(db.String(50), default=DEFAULT_MODEL)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship('Message', backref='chat', lazy=True, cascade='all, delete-orphan', order_by='Message.created_at')


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Server error: {error}', exc_info=True)
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Internal server error', 'details': str(error)}), 500
    return '<h1>Server Error</h1><p>Something went wrong. Please try again later.</p>', 500


@app.route('/')
def home():
    return render_template('home.html', user=current_user)


@app.route('/tos')
def tos():
    return render_template('tos.html', user=current_user)


@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html', user=current_user, models=AVAILABLE_MODELS)


@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user, models=AVAILABLE_MODELS)


PROD_REDIRECT_URI = 'https://xelum-v1-lv.vercel.app/auth/callback'

def get_redirect_uri():
    uri = request.url_root.rstrip('/') + '/auth/callback'
    # If running on localhost, use auto-detected URI
    if 'localhost' in uri or '127.0.0.1' in uri:
        logger.info(f"Local dev redirect_uri: {uri}")
        return uri
    # Production: always use the fixed domain
    logger.info(f"Production redirect_uri: {PROD_REDIRECT_URI}")
    return PROD_REDIRECT_URI


@app.route('/auth/google')
def auth_google():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return """
        <h1>Google OAuth not configured</h1>
        <p>Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.</p>
        <a href='/'>Go Home</a>
        """, 500

    state = secrets.token_urlsafe(32)
    session.permanent = True
    session['oauth_state'] = state
    session.modified = True

    redirect_uri = get_redirect_uri()
    authorize_url = (
        'https://accounts.google.com/o/oauth2/v2/auth'
        f'?response_type=code'
        f'&client_id={GOOGLE_CLIENT_ID}'
        f'&redirect_uri={redirect_uri}'
        f'&scope=openid%20email%20profile'
        f'&state={state}'
        f'&access_type=offline'
    )
    logger.info(f"Redirecting to Google OAuth, redirect_uri={redirect_uri}, state={state}")
    return redirect(authorize_url)


@app.route('/oauth-debug')
def oauth_debug():
    redirect_uri = get_redirect_uri()
    session_state = session.get('oauth_state', 'NOT SET')
    return f"""
    <h1>OAuth Debug</h1>
    <p><b>Redirect URI sent to Google:</b> <code>{redirect_uri}</code></p>
    <p><b>Client ID:</b> <code>{GOOGLE_CLIENT_ID[:20]}...</code></p>
    <p><b>Session state:</b> <code>{session_state}</code></p>
    <p><b>Session contents:</b> <pre>{dict(session)}</pre></p>
    <hr>
    <p><b>Что делать:</b></p>
    <ol>
        <li>Открой <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console → Credentials</a></li>
        <li>Найди свой OAuth 2.0 Client ID и нажми Edit</li>
        <li>В поле <b>Authorized redirect URIs</b> добавь ТОЧНО этот URI:</li>
    </ol>
    <pre style="background:#eee;padding:10px;">{redirect_uri}</pre>
    <p>После сохранения подожди 1–2 минуты и попробуй снова.</p>
    <a href="/">Go Home</a>
    """


@app.route('/auth/callback')
def auth_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    stored_state = session.pop('oauth_state', None)

    logger.info(f"Callback received: code={'yes' if code else 'no'}, state={state}, stored_state={stored_state}")

    if not code:
        return '<h1>OAuth Error</h1><p>No authorization code received.</p><a href="/">Go Home</a>', 400

    if state != stored_state:
        logger.error(f"State mismatch: received={state}, stored={stored_state}")
        return f'<h1>OAuth Error</h1><p>CSRF state mismatch. Please try again.</p><a href="/">Go Home</a>', 400

    # Exchange code for token
    redirect_uri = get_redirect_uri()
    token_data = {
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }

    try:
        token_resp = requests.post('https://oauth2.googleapis.com/token', data=token_data, timeout=10)
        token_resp.raise_for_status()
        tokens = token_resp.json()
    except Exception as e:
        logger.error(f"Token exchange failed: {e}")
        return f'<h1>OAuth Error</h1><p>Failed to exchange code for token: {e}</p><a href="/">Go Home</a>', 400

    access_token = tokens.get('access_token')
    if not access_token:
        return '<h1>OAuth Error</h1><p>No access token received.</p><a href="/">Go Home</a>', 400

    # Get user info
    try:
        user_resp = requests.get(
            'https://www.googleapis.com/oauth2/v1/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            params={'alt': 'json'},
            timeout=10
        )
        user_resp.raise_for_status()
        user_info = user_resp.json()
    except Exception as e:
        logger.error(f"User info fetch failed: {e}")
        return f'<h1>OAuth Error</h1><p>Failed to get user info: {e}</p><a href="/">Go Home</a>', 400

    google_id = user_info.get('id')
    email = user_info.get('email')
    if not google_id or not email:
        return '<h1>OAuth Error</h1><p>Invalid user info from Google.</p><a href="/">Go Home</a>', 400

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User(
            google_id=google_id,
            email=email,
            name=user_info.get('name'),
            picture=user_info.get('picture')
        )
        db.session.add(user)
        db.session.commit()

    login_user(user)
    return redirect(url_for('chat'))


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))


# =============================================================================
# CHAT API
# =============================================================================

@app.route('/api/chats', methods=['GET'])
@login_required
def api_chats():
    chats = Chat.query.filter_by(user_id=current_user.id).order_by(Chat.updated_at.desc()).all()
    return jsonify([{
        'id': c.id,
        'title': c.title,
        'model': c.model,
        'created_at': c.created_at.isoformat(),
        'updated_at': c.updated_at.isoformat(),
    } for c in chats])


@app.route('/api/chats', methods=['POST'])
@login_required
def api_create_chat():
    data = request.get_json() or {}
    chat = Chat(
        user_id=current_user.id,
        title=data.get('title', 'New Chat'),
        model=data.get('model', DEFAULT_MODEL),
    )
    db.session.add(chat)
    db.session.commit()
    return jsonify({'id': chat.id, 'title': chat.title, 'model': chat.model})


@app.route('/api/chats/<int:chat_id>', methods=['DELETE'])
@login_required
def api_delete_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first_or_404()
    db.session.delete(chat)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/chats/clear', methods=['POST'])
@login_required
def api_clear_all_chats():
    Chat.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/chats/<int:chat_id>/messages', methods=['GET'])
@login_required
def api_chat_messages(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first_or_404()
    return jsonify([{
        'id': m.id,
        'role': m.role,
        'content': m.content,
        'created_at': m.created_at.isoformat(),
    } for m in chat.messages])


@app.route('/api/chats/<int:chat_id>/rename', methods=['POST'])
@login_required
def api_rename_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    chat.title = data.get('title', chat.title)
    db.session.commit()
    return jsonify({'success': True, 'title': chat.title})


@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        messages_raw = data.get('messages', [])
        chat_id = data.get('chat_id')
        model = data.get('model', DEFAULT_MODEL)

        if not isinstance(messages_raw, list):
            return jsonify({'error': 'messages must be a list'}), 400

        # Get or create chat
        if chat_id:
            chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first_or_404()
            chat.model = model
        else:
            title = 'New Chat'
            for m in messages_raw:
                if m.get('role') == 'user':
                    title = m.get('content', '')[:40] + ('...' if len(m.get('content', '')) > 40 else '')
                    break
            chat = Chat(user_id=current_user.id, title=title or 'New Chat', model=model)
            db.session.add(chat)

        chat.updated_at = datetime.utcnow()
        db.session.commit()

        # Save user message to DB
        if messages_raw:
            last_msg = messages_raw[-1]
            if last_msg.get('role') == 'user':
                db_msg = Message(chat_id=chat.id, role='user', content=last_msg.get('content', ''))
                db.session.add(db_msg)
                db.session.commit()

        # Image generation model
        if model == 'flux-dev':
            try:
                prompt = ''
                for m in reversed(messages_raw):
                    if m.get('role') == 'user':
                        prompt = m.get('content', '')
                        break

                response = client.images.generate(
                    model='flux-dev',
                    prompt=prompt,
                )
                image_url = response.data[0].url

                db_msg = Message(chat_id=chat.id, role='assistant', content=image_url)
                db.session.add(db_msg)
                db.session.commit()

                return jsonify({'reply': image_url, 'image_url': image_url, 'chat_id': chat.id})
            except Exception as e:
                logger.error(f'Image generation error: {e}')
                return jsonify({'error': str(e)}), 500

        # Text generation
        api_messages = [
            {"role": "system", "content": "You are a helpful AI assistant. Answer in the same language the user writes in. When writing code, always wrap it in triple backticks with language name like ```python. When writing chemical reactions or formulas, always wrap them in triple backticks with chem language like ```chem."},
            *messages_raw,
        ]

        completion = client.chat.completions.create(model=model, messages=api_messages)
        reply = completion.choices[0].message.content

        db_msg = Message(chat_id=chat.id, role='assistant', content=reply)
        db.session.add(db_msg)
        db.session.commit()

        return jsonify({'reply': reply, 'chat_id': chat.id})
    except Exception as e:
        logger.error(f'API chat error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# =============================================================================
# PROFILE API
# =============================================================================

@app.route('/api/profile', methods=['POST'])
@login_required
def api_update_profile():
    data = request.get_json() or {}
    current_user.nickname = data.get('nickname', current_user.nickname)
    current_user.avatar_url = data.get('avatar_url', current_user.avatar_url)
    db.session.commit()
    return jsonify({
        'success': True,
        'name': current_user.name,
        'nickname': current_user.nickname,
        'email': current_user.email,
        'picture': current_user.avatar_url or current_user.picture,
    })


# Fallback for old /files/ references
@app.route('/files/<path:filename>')
def files(filename):
    # Try static folder first
    for folder in ['css', 'js', 'images']:
        folder_path = os.path.join(app.root_path, 'static', folder)
        if os.path.exists(os.path.join(folder_path, filename)):
            return send_from_directory(folder_path, filename)
    # Try pages folder (original structure)
    for folder in ['home', 'tos', 'chat']:
        folder_path = os.path.join(app.root_path, 'pages', folder)
        if os.path.exists(os.path.join(folder_path, filename)):
            return send_from_directory(folder_path, filename)
    return "Not found", 404


# Create tables on startup (works for both local and Vercel)
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
