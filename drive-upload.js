// Google OAuth configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'; // Your folder ID

// Utils object with all required functions
const utils = {
    showMessage: function(message, duration = 3000) {
        const statusEl = document.getElementById('statusMessage') || document.createElement('div');
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
        statusEl.textContent = message;
        document.body.appendChild(statusEl);
        setTimeout(() => statusEl.remove(), duration);
    },
    cleanupMediaStream: function(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
};

let tokenClient = null;
let accessToken = null;

// Initialize Google Identity Services
function initializeGoogleAuth() {
    google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
            if (response.access_token) {
                accessToken = response.access_token;
                console.log('Token obtained successfully');
            }
        }
    });
}

async function getAccessToken() {
    if (accessToken) {
        return accessToken;
    }

    return new Promise((resolve, reject) => {
        try {
            google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (response) => {
                    if (response.access_token) {
                        accessToken = response.access_token;
                        resolve(accessToken);
                    } else {
                        reject(new Error('Failed to get access token'));
                    }
                }
            }).requestAccessToken();
        } catch (err) {
            reject(err);
        }
    });
}

async function uploadToDrive(file, type = 'image') {
    try {
        const metadata = {
            name: `${type}_${new Date().toISOString()}.${type === 'image' ? 'jpg' : 'mp4'}`,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
            parents: [FOLDER_ID]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        let token;
        try {
            token = await getAccessToken();
        } catch (error) {
            console.error('Authentication error:', error);
            utils.showMessage('Please sign in to upload');
            return;
        }

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: form
        });

        if (!response.ok) {
            if (response.status === 401) {
                accessToken = null;
                return uploadToDrive(file, type);
            }
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result);
        utils.showMessage('Upload complete', 2000);
        return result;

    } catch (error) {
        console.error('Upload error:', error);
        utils.showMessage('Upload failed: ' + error.message);
        throw error;
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = initializeGoogleAuth;
    document.body.appendChild(script);
});

// Export functions and utils
window.uploadToDrive = uploadToDrive;
window.utils = utils;
