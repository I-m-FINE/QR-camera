// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';
const REDIRECT_URI = 'https://i-m-fine.github.io/QR-camera/';

// Function to show status messages (moved from main file)
function showStatus(message, duration = 3000) {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) {
        const div = document.createElement('div');
        div.id = 'statusMessage';
        div.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            text-align: center;
        document.body.appendChild(div);
    }
    
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, duration);
}

// Create an iOS-native friendly login UI
function createIOSLoginUI() {
    const existingLogin = document.querySelector('.ios-login-container');
    if (existingLogin) existingLogin.remove();

    const container = document.createElement('div');
    container.className = 'ios-login-container';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const loginBox = document.createElement('div');
    loginBox.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        width: 85%;
        max-width: 300px;
        text-align: center;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Sign in Required';
    title.style.cssText = 'color: #333; margin-bottom: 15px;';

    const text = document.createElement('p');
    text.textContent = 'To enable automatic upload of photos and videos, please sign in with your Google account.';
    text.style.cssText = 'color: #666; margin-bottom: 20px;';

    const signInButton = document.createElement('button');
    signInButton.textContent = 'Sign in with Google';
    signInButton.style.cssText = `
        background: #4285f4;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 24px;
        font-weight: bold;
        cursor: pointer;
    `;

    // Set up OAuth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(SCOPES)}`;

    signInButton.onclick = () => {
        window.location.href = authUrl;
    };

    loginBox.appendChild(title);
    loginBox.appendChild(text);
    loginBox.appendChild(signInButton);
    container.appendChild(loginBox);
    document.body.appendChild(container);
}

// Handle OAuth callback
window.addEventListener('load', function() {
    if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const token = params.get('access_token');
        if (token) {
            localStorage.setItem('googleToken', token);
            const loginUI = document.querySelector('.ios-login-container');
            if (loginUI) loginUI.remove();
            showStatus('Successfully signed in!', 2000);
        }
    }
});

// Upload function
async function uploadToDrive(blob, type = 'image') {
    try {
        const token = localStorage.getItem('googleToken');
        if (!token) {
            createIOSLoginUI();
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = type === 'video' ? '.webm' : '.jpg';
        const fileName = `${type}_${timestamp}${fileExtension}`;
        
        // Create metadata with specific folder ID
        const metadata = {
            name: fileName,
            mimeType: type === 'video' ? 'video/webm' : 'image/jpeg',
            parents: [FOLDER_ID] // Specify the folder ID here
        };

        // Create multipart form data
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        // Upload to Drive
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Upload successful:', result);
        showStatus('Upload complete!', 2000);
        return result;

    } catch (error) {
        console.error('Upload error:', error);
        if (error.message.includes('401')) {
            // Token expired or invalid
            localStorage.removeItem('googleToken');
            createIOSLoginUI();
        } else {
            showStatus('Upload failed: ' + error.message, 3000);
        }
        throw error;
    }
}

// Export the necessary functions
window.uploadToDrive = uploadToDrive;
window.createIOSLoginUI = createIOSLoginUI;
window.showStatus = showStatus;
