// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';

let accessToken = null;

// Create an iOS-native friendly login UI
function createIOSLoginUI() {
    // Remove any existing login UI
    const existingLogin = document.querySelector('.ios-login-container');
    if (existingLogin) existingLogin.remove();

    // Create elements
    const container = document.createElement('div');
    const loginBox = document.createElement('div');
    const title = document.createElement('div');
    const text = document.createElement('div');
    const signInLink = document.createElement('a');

    // Set classes and content
    container.className = 'ios-login-container';
    loginBox.className = 'ios-login-box';
    title.className = 'ios-login-title';
    text.className = 'ios-login-text';
    signInLink.className = 'ios-sign-in-btn';
    signInLink.id = 'iosSignInButton';

    title.textContent = 'Sign in Required';
    text.textContent = 'To enable automatic upload of photos and videos, please sign in with your Google account.';
    signInLink.textContent = 'Sign in with Google';

    // Style elements
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

    loginBox.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        width: 85%;
        max-width: 300px;
        text-align: center;
    `;

    title.style.cssText = `
        color: #333;
        font-size: 18px;
        margin-bottom: 15px;
        font-weight: bold;
    `;

    text.style.cssText = `
        color: #666;
        font-size: 14px;
        margin-bottom: 20px;
        line-height: 1.4;
    `;

    signInLink.style.cssText = `
        display: block;
        background: #4285f4;
        color: white;
        font-size: 16px;
        padding: 12px 24px;
        border-radius: 24px;
        text-decoration: none;
        width: 80%;
        margin: 0 auto;
        font-weight: bold;
        -webkit-tap-highlight-color: transparent;
    `;

    // Set direct auth URL
    const redirectUri = 'https://i-m-fine.github.io/QR-camera/';
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' + 
        '?client_id=997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com' +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&response_type=token' +
        '&scope=https://www.googleapis.com/auth/drive.file';

    signInLink.href = authUrl;

    // Add click handler
    signInLink.onclick = function(e) {
        e.preventDefault();
        console.log('Starting auth redirect...');
        window.location.replace(authUrl);
    };

    // Build DOM
    loginBox.appendChild(title);
    loginBox.appendChild(text);
    loginBox.appendChild(signInLink);
    container.appendChild(loginBox);
    document.body.appendChild(container);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !localStorage.getItem('googleToken')) {
        console.log('iOS device detected, showing login UI');
        setTimeout(createIOSLoginUI, 1000);
    }
});

// Handle auth callback
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

async function initializeGoogleAuth() {
    try {
        console.log('[' + new Date().toISOString() + '] Initializing Google API');
        
        // Load Google Identity Services
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });

        // Wait for google to be defined
        while (!window.google) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Initialize token client
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    console.log('[' + new Date().toISOString() + '] Successfully authenticated with Google Drive');
                }
            },
        });

        // Request token immediately
        client.requestAccessToken();
    } catch (error) {
        console.error('[' + new Date().toISOString() + '] Error initializing Google API:', error);
        throw error;
    }
}

async function uploadToDrive(blob, type = 'image') {
    try {
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }
        return await performUpload(blob, type, accessToken);
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function performUpload(blob, type, token) {
    const timestamp = new Date().getTime();
    const fileExtension = type === 'video' ? '.webm' : '.jpg';
    const mimeType = type === 'video' ? 'video/webm' : 'image/jpeg';
    const fileName = `${type}_${timestamp}${fileExtension}`;
    
    const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: [FOLDER_ID]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: form
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[' + new Date().toISOString() + '] Upload successful:', result);
    return result;
}
