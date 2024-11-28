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
        accessToken: null,
        folderId: '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'
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
                window.googleApi.state.accessToken = tokenResponse.access_token;
                debugLog('Token received:', tokenResponse);
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
    debugLog('Starting upload process');
    
    try {
        // Check initialization
        if (!window.googleApi.state.gapiInited) {
            debugLog('Google API not initialized, attempting to initialize');
            await window.initGoogleApi();
        }

        // Request token with popup
        debugLog('Requesting token');
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
                    window.googleApi.state.accessToken = resp.access_token;
                    resolve(resp);
                };

                tokenClient.requestAccessToken({ prompt: '' });
            } catch (err) {
                reject(err);
            }
        });

        // Create file metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;
        const mimeType = type === 'image' ? 'image/jpeg' : 'video/webm';
        
        debugLog('Preparing file upload:', { fileName, mimeType });

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        debugLog('File converted to base64, starting upload');

        // Create file metadata with parent folder
        const fileMetadata = {
            name: fileName,
            mimeType: mimeType,
            parents: [window.googleApi.state.folderId]
        };

        // Upload file
        const response = await gapi.client.drive.files.create({
            resource: fileMetadata,
            media: {
                mimeType: mimeType,
                body: base64Data
            },
            fields: 'id,webViewLink,size,mimeType'
        });

        debugLog('Upload response:', response);

        // Verify upload
        if (!response.result || !response.result.id) {
            throw new Error('Upload failed - no file ID received');
        }

        // Verify file size
        const file = await gapi.client.drive.files.get({
            fileId: response.result.id,
            fields: 'size,mimeType'
        });

        debugLog('File details:', file.result);

        if (!file.result.size || file.result.size === '0') {
            throw new Error('Upload failed - file size is 0');
        }

        debugLog('Upload successful:', response.result);
        
        // Open the file in a new tab
        if (response.result.webViewLink) {
            window.open(response.result.webViewLink, '_blank');
        }

        return response.result;

    } catch (error) {
        debugLog('Upload failed:', error);
        if (error.error === 'popup_closed_by_user') {
            throw new Error('Authentication cancelled by user');
        }
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
