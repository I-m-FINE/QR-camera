// First, create and export utils
window.utils = {
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

// Token handling
let accessToken = null;

// Export getAccessToken function
window.getAccessToken = async function() {
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
};

// Export upload function
window.uploadToDrive = async function(file, type = 'image') {
    console.log('Starting upload process...');
    
    // Update these folder IDs with your actual Google Drive folder IDs
    const MAIN_FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';
    const BACKUP_FOLDER_ID = '1vsvYXG3w_nnJOp845et41CJWrRP4iFHF';
    
    console.log('Main folder ID:', MAIN_FOLDER_ID);
    console.log('Backup folder ID:', BACKUP_FOLDER_ID);

    async function singleUpload(folderId, isBackup) {
        try {
            console.log(`Starting upload to ${isBackup ? 'backup' : 'main'} folder: ${folderId}`);
            
            const metadata = {
                name: `${type}_${new Date().toISOString()}${isBackup ? '_backup' : ''}.${type === 'image' ? 'jpg' : 'mp4'}`,
                mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
                parents: [folderId]
            };

            console.log(`Metadata for ${isBackup ? 'backup' : 'main'} upload:`, metadata);

            const token = await window.getAccessToken();
            if (!token) {
                throw new Error('No access token available');
            }

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${errorText}`);
            }

            const result = await response.json();
            console.log(`Upload successful to ${isBackup ? 'backup' : 'main'} folder:`, result);
            return result;
        } catch (error) {
            console.error(`Error in ${isBackup ? 'backup' : 'main'} upload:`, error);
            throw error;
        }
    }

    try {
        const mainResult = await singleUpload(MAIN_FOLDER_ID, false);
        console.log('Main upload completed successfully');

        try {
            const backupResult = await singleUpload(BACKUP_FOLDER_ID, true);
            console.log('Backup upload completed successfully');
            window.utils.showMessage('Files uploaded successfully to folders', 2000);
            return { main: mainResult, backup: backupResult };
        } catch (backupError) {
            console.warn('Backup upload failed:', backupError);
            window.utils.showMessage('File upload error', 2000);
            return { main: mainResult, backup: null, backupError };
        }
    } catch (error) {
        console.error('Upload process error:', error);
        window.utils.showMessage('Upload failed: ' + error.message);
        throw error;
    }
};

// Initialize Google Auth when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
        google.accounts.oauth2.initTokenClient({
            client_id: '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => {
                if (response.access_token) {
                    accessToken = response.access_token;
                    console.log('Initial token obtained successfully');
                }
            }
        });
    };
    document.body.appendChild(script);
});
