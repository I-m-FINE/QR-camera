// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCiSB89a73LV0jvQJca2B6lx2slwgNFX6I';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Load the Google API client library
function loadGoogleAPI() {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
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
            scope: SCOPES
        });

        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        // Handle the initial sign-in state
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    } catch (error) {
        console.error('Error initializing Google API:', error);
    }
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        document.getElementById('upload').disabled = false;
    } else {
        document.getElementById('upload').disabled = true;
    }
}

async function uploadToDrive(imageBlob) {
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        await gapi.auth2.getAuthInstance().signIn();
    }

    const fileName = 'photo_' + new Date().getTime() + '.jpg';
    const metadata = {
        name: fileName,
        mimeType: 'image/jpeg',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', imageBlob);

    try {
        const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: form,
        });

        const result = await response.json();
        alert('File uploaded successfully!');
        return result;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        alert('Error uploading file. Please try again.');
    }
}

// Load the Google API when the page loads
document.addEventListener('DOMContentLoaded', loadGoogleAPI);
