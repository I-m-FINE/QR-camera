// Define utils first
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
    }
};

// OAuth and token handling
let accessToken = null;
let tokenClient = null;

function initializeGoogleAuth() {
    google.accounts.oauth2.initTokenClient({
        client_id: '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com',
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
                client_id: '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (response) => {
                    if (response.access_token) {
                        accessToken = response.access_token;
                        resolve(accessToken);
                    } else {
                        reject(new Error('Failed to get access token'));
                    }
                },
            }).requestAccessToken();
        } catch (error) {
            reject(error);
        }
    });
}

async function uploadToDrive(file, type = 'image') {
    const MAIN_FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';
    const BACKUP_FOLDER_ID = '1Hs_YPCwGq_YZPgxhR_Wd5YlGcBxXYZ12'; // Your backup folder ID

    try {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('No access token available');
        }

        // Create file metadata for both uploads
        const timestamp = new Date().toISOString();
        const mainMetadata = {
            name: `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'mp4'}`,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
            parents: [MAIN_FOLDER_ID]
        };

        const backupMetadata = {
            name: `${type}_${timestamp}_backup.${type === 'image' ? 'jpg' : 'mp4'}`,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
            parents: [BACKUP_FOLDER_ID]
        };

        // Create FormData for both uploads
        const mainForm = new FormData();
        mainForm.append('metadata', new Blob([JSON.stringify(mainMetadata)], { type: 'application/json' }));
        mainForm.append('file', file);

        const backupForm = new FormData();
        backupForm.append('metadata', new Blob([JSON.stringify(backupMetadata)], { type: 'application/json' }));
        backupForm.append('file', file);

        // Perform both uploads
        const mainUpload = fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: mainForm
        });

        const backupUpload = fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: backupForm
        });

        // Wait for both uploads to complete
        const [mainResponse, backupResponse] = await Promise.all([mainUpload, backupUpload]);

        // Check responses
        if (!mainResponse.ok || !backupResponse.ok) {
            throw new Error('One or both uploads failed');
        }

        // Get results
        const mainResult = await mainResponse.json();
        const backupResult = await backupResponse.json();

        console.log('Main upload result:', mainResult);
        console.log('Backup upload result:', backupResult);

        utils.showMessage('Files uploaded successfully', 2000);
        return { main: mainResult, backup: backupResult };

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

// Export to window
window.uploadToDrive = uploadToDrive;
window.utils = utils;
window.getAccessToken = getAccessToken;
