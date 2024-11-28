// Debug logging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
}

// Global state with your folder ID
window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        accessToken: null,
        folderId: '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'  // Your specific folder ID
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
    debugLog('Starting upload process', { blobSize: blob.size, blobType: blob.type });
    
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
        
        debugLog('Preparing file upload:', { fileName, mimeType, folderId: window.googleApi.state.folderId });

        // Convert blob to array buffer
        const arrayBuffer = await blob.arrayBuffer();
        const base64Data = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Create metadata part
        const metadata = {
            name: fileName,
            mimeType: mimeType,
            parents: [window.googleApi.state.folderId]
        };

        // Create multipart request body
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + mimeType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim;

        debugLog('Sending upload request');

        // Make the upload request
        const response = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: {
                uploadType: 'multipart'
            },
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`,
                'Authorization': 'Bearer ' + window.googleApi.state.accessToken
            },
            body: multipartRequestBody
        });

        debugLog('Initial upload response:', response);

        // Verify the upload
        const file = await gapi.client.drive.files.get({
            fileId: response.result.id,
            fields: '*'
        });

        debugLog('File verification:', file.result);

        if (!file.result.size || parseInt(file.result.size) === 0) {
            throw new Error('Upload verification failed - file size is 0');
        }

        showStatus('File uploaded successfully');
        debugLog('Upload successful:', file.result);

        // Open the file in a new tab
        if (file.result.webViewLink) {
            window.open(file.result.webViewLink, '_blank');
        }

        return file.result;

    } catch (error) {
        debugLog('Upload failed:', error);
        showStatus('Upload failed: ' + error.message);
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
