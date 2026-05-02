const nicknameInput = document.getElementById('nicknameInput');
const avatarUrlInput = document.getElementById('avatarUrlInput');
const avatarFileInput = document.getElementById('avatarFileInput');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const saveBtn = document.getElementById('saveProfileBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileAvatarPlaceholder = document.getElementById('profileAvatarPlaceholder');

function updateAvatarPreview(url) {
  if (!url) return;
  if (profileAvatar) {
    profileAvatar.src = url;
  } else if (profileAvatarPlaceholder) {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'profile-avatar';
    img.id = 'profileAvatar';
    img.alt = 'avatar';
    profileAvatarPlaceholder.replaceWith(img);
  }
}

if (avatarUrlInput) {
  avatarUrlInput.addEventListener('input', () => {
    updateAvatarPreview(avatarUrlInput.value);
  });
}

// Handle file upload
if (uploadAvatarBtn && avatarFileInput) {
  uploadAvatarBtn.addEventListener('click', () => {
    avatarFileInput.click();
  });

  avatarFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Basic adult content check (heuristic)
    const adultKeywords = ['nsfw', 'adult', 'porn', 'xxx', 'sex', 'nude', 'naked'];
    const fileName = file.name.toLowerCase();
    if (adultKeywords.some(kw => fileName.includes(kw))) {
      alert('Please upload appropriate content only. Adult material is not allowed.');
      avatarFileInput.value = '';
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      avatarUrlInput.value = base64;
      updateAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  });
}

if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nicknameInput.value.trim(),
          avatar_url: avatarUrlInput.value.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
          saveBtn.textContent = 'Save Changes';
          saveBtn.disabled = false;
        }, 1500);
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      console.error(e);
      saveBtn.textContent = 'Error!';
      setTimeout(() => {
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = false;
      }, 1500);
    }
  });
}
