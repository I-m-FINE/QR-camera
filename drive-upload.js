// Debug logging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
}

// Global state
window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        accessToken: null
    }
};

// Initialize Google API
window.initGoogleApi = async function() {
    try {
        debugLog('Initializing Google API');
        
        // Load GAPI client
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });
        debugLog('GAPI client loaded');

        // Initialize GAPI client
        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
        });
        debugLog('GAPI client initialized');

        // Load Drive API
        await gapi.client.load('drive', 'v3');
        debugLog('Drive API loaded');

        // Initialize token client
        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                    throw (tokenResponse);
                }
                debugLog('Token received successfully');
            }
        });

        window.googleApi.state.gapiInited = true;
        debugLog('Google API initialization complete');
        return true;
    } catch (error) {
        debugLog('ERROR: Google API initialization failed', error);
        return false;
    }
};

// Upload to Google Drive
window.uploadToGoogleDrive = async function(blob, type) {
    debugLog(`Starting upload for ${type}`, { blobSize: blob?.size });
    
    if (!blob) {
        throw new Error('No data to upload');
    }

    try {
        if (!window.googleApi.state.gapiInited) {
            await window.initGoogleApi();
        }

        // Request token
        await new Promise((resolve, reject) => {
            try {
                const tokenClient = window.googleApi.state.tokenClient;
                if (!tokenClient) {
                    throw new Error('Token client not initialized');
                }

                tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp);
                    }
                    resolve(resp);
                };
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                reject(err);
            }
        });

        // Create file metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;
        const mimeType = type === 'image' ? 'image/jpeg' : 'video/webm';

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Upload file
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
        return response.result;

    } catch (error) {
        debugLog('ERROR: Upload failed', error);
        throw error;
    }
};

// Initialize on page load
window.addEventListener('load', async () => {
    debugLog('Page loaded, initializing Google API');
    try {
        await window.initGoogleApi();
    } catch (error) {
        debugLog('ERROR: Failed to initialize Google API on load', error);
    }
});

debugLog('Drive upload script loaded successfully');
