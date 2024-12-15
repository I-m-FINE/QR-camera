// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';
const REDIRECT_URI = 'https://i-m-fine.github.io/QR-camera/';

// Global status message function
window.showStatus = function(message, duration = 3000) {
    let statusEl = document.getElementById('statusMessage');
    
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'statusMessage';
        statusEl.style.cssText = `
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
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, duration);
};

// Create login UI
function createIOSLoginUI() {
    // Remove any existing login UI
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
    text.textContent = 'Please sign in with your Google account to enable uploads.';
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

    // Set up OAuth URL with state parameter
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&state=${state}`;

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
        const state = params.get('state');
        
        if (token && state === localStorage.getItem('oauth_state')) {
            localStorage.setItem('googleToken', token);
            localStorage.removeItem('oauth_state');
            const loginUI = document.querySelector('.ios-login-container');
            if (loginUI) loginUI.remove();
            showStatus('Successfully signed in!', 2000);
            
            // Clear the hash from URL
            history.replaceState(null, '', window.location.pathname);
        }
    }
});

// Upload function
async function uploadToDrive(file, type = 'image') {
    // Replace these with your actual folder IDs
    const MAIN_FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';
    const BACKUP_FOLDER_ID = '1Hs_YPCwGq_YZPgxhR_Wd5YlGcBxXYZ12'; // Make sure this is your correct backup folder ID

    async function uploadToFolder(folderId, isBackup = false) {
        console.log(`Attempting upload to folder: ${folderId} (${isBackup ? 'Backup' : 'Main'})`);
        
        const metadata = {
            name: `${type}_${new Date().toISOString()}${isBackup ? '_backup' : ''}.${type === 'image' ? 'jpg' : 'mp4'}`,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
            parents: [folderId]
        };

        console.log('Uploading with metadata:', metadata);

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        try {
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await getAccessToken()}`,
                },
                body: form
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Upload failed to ${isBackup ? 'backup' : 'main'} folder:`, errorText);
                throw new Error(`Upload to ${isBackup ? 'backup' : 'main'} folder failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`Successfully uploaded to ${isBackup ? 'backup' : 'main'} folder:`, result);
            return result;
        } catch (error) {
            console.error(`Error in ${isBackup ? 'backup' : 'main'} upload:`, error);
            throw error;
        }
    }

    try {
        // Get token once for both uploads
        const token = await getAccessToken();
        if (!token) {
            throw new Error('Failed to get access token');
        }

        console.log('Starting uploads to both folders...');

        // Upload to main folder
        const mainResult = await uploadToFolder(MAIN_FOLDER_ID, false);
        console.log('Main folder upload complete');

        // Upload to backup folder
        const backupResult = await uploadToFolder(BACKUP_FOLDER_ID, true);
        console.log('Backup folder upload complete');

        utils.showMessage('Upload complete to both folders', 2000);
        return { main: mainResult, backup: backupResult };

    } catch (error) {
        console.error('Upload process error:', error);
        utils.showMessage('Upload failed: ' + error.message);
        throw error;
    }
}

// Helper function to show status
function showStatus(message) {
    console.log(message);
    utils.showMessage(message);
}

// Export functions
window.uploadToDrive = uploadToDrive;
window.utils = utils;
