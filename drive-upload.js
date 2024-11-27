window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        accessToken: null
    }
};

// Debug helper
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
}

// Global variables to store captured media
window.capturedMedia = {
    currentPhoto: null,
    currentVideo: null
};

// Function to show upload button with debug
function showUploadButton(type) {
    debugLog(`Showing upload button for type: ${type}`);
    const buttonId = type === 'image' ? 'uploadPhoto' : 'uploadVideo';
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = 'block';
        button.classList.add('control-button');
        debugLog(`Upload button ${buttonId} displayed`);
    } else {
        debugLog(`ERROR: Upload button ${buttonId} not found in DOM`);
    }
}

// Handle captured media with debug
window.handleCapture = function(blob, type) {
    debugLog(`Handling captured ${type}`, { blobSize: blob?.size });
    if (!blob) {
        debugLog('ERROR: No blob provided to handleCapture');
        return;
    }

    if (type === 'image') {
        window.capturedMedia.currentPhoto = blob;
        debugLog('Photo blob stored');
    } else {
        window.capturedMedia.currentVideo = blob;
        debugLog('Video blob stored');
    }
    showUploadButton(type);
};

// Initialize Google API with debug
window.initGoogleApi = async function() {
    try {
        debugLog('Initializing Google API');
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });
        debugLog('GAPI client loaded');

        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
        });
        debugLog('GAPI client initialized');

        await gapi.client.load('drive', 'v3');
        debugLog('Drive API loaded');

        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            prompt: 'consent'
        });

        window.googleApi.state.tokenClient = tokenClient;
        window.googleApi.state.gapiInited = true;
        
        debugLog('Google API initialization complete');
        return true;
    } catch (error) {
        debugLog('ERROR: Google API initialization failed', error);
        return false;
    }
};

// Upload to Google Drive with debug
window.uploadToGoogleDrive = async function(blob, type) {
    debugLog(`Starting upload for ${type}`, { blobSize: blob?.size });
    
    if (!blob) {
        const error = new Error('No data to upload');
        debugLog('ERROR: Upload failed - no blob', error);
        throw error;
    }

    try {
        if (!window.googleApi.state.gapiInited) {
            debugLog('API not initialized, initializing now');
            await window.initGoogleApi();
        }

        showStatus('Starting upload...');
        debugLog('Requesting access token');

        // Get token with debug
        await new Promise((resolve, reject) => {
            try {
                const tokenClient = window.googleApi.state.tokenClient;
                if (!tokenClient) {
                    throw new Error('Token client not initialized');
                }

                debugLog('Token client found, requesting token');
                tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        debugLog('ERROR: Token request failed', resp.error);
                        reject(resp);
                    } else {
                        debugLog('Token received successfully');
                        resolve(resp);
                    }
                };
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                debugLog('ERROR: Token request error', err);
                reject(err);
            }
        });

        // Create file metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;
        const mimeType = type === 'image' ? 'image/jpeg' : 'video/webm';
        debugLog('Prepared file metadata', { fileName, mimeType });

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                debugLog('Blob converted to base64');
                resolve(reader.result.split(',')[1]);
            };
            reader.onerror = (error) => {
                debugLog('ERROR: Blob conversion failed', error);
                reject(error);
            };
            reader.readAsDataURL(blob);
        });

        // Upload file
        debugLog('Starting file upload to Drive');
        const response = await gapi.client.drive.files.create({
            resource: { 
                name: fileName,
                mimeType: mimeType
            },
            media: {
                mimeType: mimeType,
                body: base64Data
            },
            fields: 'id,webViewLink'
        });

        debugLog('File uploaded successfully', response.result);
        showStatus('Upload successful!');
        return response.result;

    } catch (error) {
        debugLog('ERROR: Upload failed', error);
        showStatus('Upload failed: ' + error.message);
        throw error;
    }
};

// Initialize on page load
window.addEventListener('load', async () => {
    debugLog('Page loaded, initializing Google API');
    try {
        await window.initGoogleApi();
        debugLog('Google API initialized on page load');
    } catch (error) {
        debugLog('ERROR: Failed to initialize Google API on load', error);
    }
});

debugLog('Drive upload script loaded successfully');
