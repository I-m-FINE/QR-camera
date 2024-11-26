// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCiSB89a73LV0jvQJca2B6lx2slwgNFX6I';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'; 

// Load the Google Identity Services library
function loadGoogleIdentity() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
}

async function uploadToDrive(imageBlob) {
    try {
        // Get token using Google Identity Services
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    await uploadFile(imageBlob, tokenResponse.access_token);
                }
            },
        });

        client.requestAccessToken();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function uploadFile(imageBlob, accessToken) {
    const fileName = 'photo_' + new Date().getTime() + '.jpg';
    const metadata = {
        name: fileName,
        mimeType: 'image/jpeg',
        parents: [FOLDER_ID]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', imageBlob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: form
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    alert('Photo uploaded successfully!');
    return result;
}

// Load Google Identity Services when page loads
document.addEventListener('DOMContentLoaded', loadGoogleIdentity);
