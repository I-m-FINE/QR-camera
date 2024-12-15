// Google OAuth configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCiSB89a73LV0jvQJca2B6lx2slwgNFX6I'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB';
const REDIRECT_URI = 'https://i-m-fine.github.io/QR-camera/';

// Initialize Google API client
function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
    }).then(() => {
        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        // Handle the initial sign-in state
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    }).catch(error => {
        console.error('Error initializing GAPI client:', error);
    });
}

// Update UI based on sign-in status
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        console.log('User is signed in');
    } else {
        console.log('User is not signed in');
        handleAuthClick();
    }
}

// Handle login
function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
}

// Handle logout
function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut();
}

// Get access token
async function getAccessToken() {
    if (!gapi.auth2) {
        await new Promise((resolve) => {
            gapi.load('client:auth2', async () => {
                await initClient();
                resolve();
            });
        });
    }

    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
    }

    const currentUser = authInstance.currentUser.get();
    const token = currentUser.getAuthResponse().access_token;
    return token;
}

async function uploadToDrive(file, type = 'image') {
    try {
        // Get the specific folder ID
        const folderId = '1YourSpecificFolderID'; // Replace with your actual folder ID
        
        const metadata = {
            name: `${type}_${new Date().toISOString()}.${type === 'image' ? 'jpg' : 'mp4'}`,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const accessToken = await getAccessToken();
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result);
        showStatusMessage('Upload complete', 2000);
        return result;

    } catch (error) {
        console.error('Upload error:', error);
        if (error.message.includes('auth') || error.message.includes('401')) {
            // Try to re-authenticate
            try {
                await handleAuthClick();
                // Retry upload after re-authentication
                return uploadToDrive(file, type);
            } catch (authError) {
                showStatusMessage('Authentication failed. Please try again.');
            }
        } else {
            showStatusMessage('Upload failed: ' + error.message);
        }
        throw error;
    }
}

function showStatusMessage(message, duration = 3000) {
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

// Export functions if using modules
window.uploadToDrive = uploadToDrive;
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
