// Google OAuth configuration
const CLIENT_ID = '997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const FOLDER_ID = '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'; 
let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize the tokenClient
function initializeGapiClient() {
    gapi.client.init({
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    }).then(() => {
        gapiInited = true;
        maybeEnableButtons();
    });
}

// Initialize Google Identity Services
function initializeGis() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
            if (response.access_token) {
                // Store the token and expiry time
                localStorage.setItem('gapi_token', response.access_token);
                localStorage.setItem('gapi_token_expiry', Date.now() + (response.expires_in * 1000));
                console.log('Token stored successfully');
            }
        }
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        console.log('Google APIs initialized');
    }
}

// Get access token using stored token or request new one
async function getAccessToken() {
    const storedToken = localStorage.getItem('gapi_token');
    const tokenExpiry = localStorage.getItem('gapi_token_expiry');
    
    // Check if we have a valid token
    if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        console.log('Using stored token');
        return storedToken;
    }

    // Token doesn't exist or is expired, request new one
    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = (response) => {
                if (response.error !== undefined) {
                    reject(response);
                    return;
                }
                resolve(response.access_token);
            };
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
            reject(err);
        }
    });
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

        let accessToken;
        try {
            accessToken = await getAccessToken();
        } catch (error) {
            console.error('Authentication error:', error);
            showStatusMessage('Please sign in to upload');
            return;
        }

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: form
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token might be invalid, clear storage and try again
                localStorage.removeItem('gapi_token');
                localStorage.removeItem('gapi_token_expiry');
                return uploadToDrive(file, type); // Retry upload
            }
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result);
        showStatusMessage('Upload complete', 2000);
        return result;

    } catch (error) {
        console.error('Upload error:', error);
        showStatusMessage('Upload failed: ' + error.message);
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

// Initialize the Google APIs
document.addEventListener('DOMContentLoaded', () => {
    gapi.load('client', initializeGapiClient);
    initializeGis();
});

// Export functions
window.uploadToDrive = uploadToDrive;
