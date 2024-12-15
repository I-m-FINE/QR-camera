// Google OAuth configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'; // Replace with your actual folder ID
const SERVICE_ACCOUNT_KEY = {
    // Add your service account key JSON here
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "your-private-key-id",
    "private_key": "your-private-key",
    "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
    "client_id": "your-client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "your-cert-url"
};

let accessToken = null;

// Helper functions
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

// Get service account token
async function getServiceAccountToken() {
    if (accessToken) {
        return accessToken;
    }

    try {
        const response = await fetch('https://your-backend-url/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get access token');
        }

        const data = await response.json();
        accessToken = data.access_token;
        return accessToken;
    } catch (error) {
        console.error('Error getting service account token:', error);
        throw error;
    }
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
            token = await getServiceAccountToken();
        } catch (error) {
            console.error('Authentication error:', error);
            utils.showMessage('Upload service unavailable');
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
                // Token expired, clear and retry
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

// Export functions and utils
window.uploadToDrive = uploadToDrive;
window.utils = utils;
