// Google OAuth2 configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCiSB89a73LV0jvQJca2B6lx2slwgNFX6I';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'; // Replace with your folder ID

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
        alert('Error initializing Google API. Please check your credentials.');
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
    try {
        // Check if Google API is loaded
        if (!window.gapi) {
            console.error('Google API not loaded');
            throw new Error('Google API not initialized - please refresh the page');
        }

        // Force new sign-in
        try {
            await gapi.auth2.getAuthInstance().signIn({
                prompt: 'select_account',
                ux_mode: 'popup'
            });
        } catch (signInError) {
            console.error('Sign in error:', signInError);
            throw new Error('Failed to sign in to Google - please try again');
        }

        const fileName = 'photo_' + new Date().getTime() + '.jpg';
        console.log('Preparing to upload:', fileName);

        const metadata = {
            name: fileName,
            mimeType: 'image/jpeg',
            parents: [FOLDER_ID]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', imageBlob);

        // Get fresh access token
        const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
        console.log('Got access token, attempting upload...');

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'multipart/related; boundary=foo_bar_baz'
            },
            body: form
        });

        // Log detailed error information
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload response:', response.status, errorText);
            throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('Upload successful:', result);
        alert('Photo uploaded successfully!');
        return result;

    } catch (error) {
        console.error('Detailed upload error:', error);
        alert('Upload failed: ' + error.message);
        throw error;
    }
}

// Load the Google API when the page loads
document.addEventListener('DOMContentLoaded', loadGoogleAPI);

document.getElementById('upload').addEventListener('click', async () => {
    if (!window.gapi || !gapi.auth2) {
        alert('Google API not initialized. Please try refreshing the page.');
        return;
    }
    
    if (imageBlob) {
        const uploadBtn = document.getElementById('upload');
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        try {
            await uploadToDrive(imageBlob);
            uploadBtn.textContent = 'Upload to Drive';
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            uploadBtn.disabled = false;
        }
    }
});

// Add this to check API loading
window.onload = function() {
    if (!window.gapi) {
        console.error('Google API failed to load');
        alert('Failed to load Google API - please check your internet connection and try again');
    }
};
