// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';

let accessToken = null;

// Initialize Google Sign-in when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load Google Identity Services
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
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
                    console.log('Successfully authenticated with Google Drive');
                }
            },
        });

        // Request token immediately
        client.requestAccessToken();
    } catch (error) {
        console.error('Error initializing Google API:', error);
    }
});

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
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
    return result;
}
