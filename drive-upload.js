// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCiSB89a73LV0jvQJca2B6lx2slwgNFX6I';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'; 

// Load the Google API client library
function loadGoogleAPI() {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        gapi.load('client:auth2', initializeGoogleAPI);
    };
    document.body.appendChild(script);
}

// Initialize the Google API client
async function initializeGoogleAPI() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            scope: SCOPES,
            plugin_name: 'QR Camera'
        });
    } catch (error) {
        console.error('Error initializing Google API:', error);
    }
}

async function uploadToDrive(imageBlob) {
    try {
        // Initialize auth client
        const authInstance = gapi.auth2.getAuthInstance();
        
        // Sign in with popup
        if (!authInstance.isSignedIn.get()) {
            await authInstance.signIn({
                ux_mode: 'redirect',  // Changed from popup to redirect
                redirect_uri: window.location.href
            });
        }

        const fileName = 'photo_' + new Date().getTime() + '.jpg';
        const metadata = {
            name: fileName,
            mimeType: 'image/jpeg',
            parents: [FOLDER_ID]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', imageBlob);

        const accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        alert('Photo uploaded successfully!');
        return result;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Load Google API when page loads
document.addEventListener('DOMContentLoaded', loadGoogleAPI);
