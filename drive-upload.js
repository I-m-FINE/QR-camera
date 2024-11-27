// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';

let accessToken = null;

async function uploadToDrive(blob, type = 'image') {
    try {
        // Check if we have a cached token
        if (accessToken) {
            // Try to use the cached token
            try {
                return await performUpload(blob, type, accessToken);
            } catch (error) {
                // If token is invalid, clear it and continue to get new token
                if (error.message.includes('401')) {
                    accessToken = null;
                } else {
                    throw error;
                }
            }
        }

        // Get new token using Google Identity Services
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    // Store the token
                    accessToken = tokenResponse.access_token;
                    return await performUpload(blob, type, accessToken);
                }
            },
        });

        client.requestAccessToken();
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

// Load Google Identity Services when page loads
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
});
