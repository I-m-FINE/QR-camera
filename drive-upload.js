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
        accessToken: localStorage.getItem('googleDriveToken'),
        folderId: '1NQFgJNr4gOIBuTYeIKhtru6tdp1oAZyB'
    }
};

// Upload to Google Drive
window.uploadToGoogleDrive = async function(blob, type) {
    debugLog('Starting upload process', { blobSize: blob.size, blobType: blob.type });
    
    try {
        // Check initialization
        if (!window.googleApi.state.gapiInited) {
            await window.initGoogleApi();
        }

        // If no token stored, request it
        if (!window.googleApi.state.accessToken) {
            await new Promise((resolve, reject) => {
                const tokenClient = window.googleApi.state.tokenClient;
                if (!tokenClient) {
                    throw new Error('Token client not initialized');
                }

                tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp);
                    }
                    window.googleApi.state.accessToken = resp.access_token;
                    localStorage.setItem('googleDriveToken', resp.access_token);
                    resolve(resp);
                };

                tokenClient.requestAccessToken({ prompt: 'consent' });
            });
        }

        // Create file metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'mp4'}`;
        const mimeType = type === 'image' ? 'image/jpeg' : 'video/mp4';
        
        debugLog('Preparing file upload:', { fileName, mimeType, folderId: window.googleApi.state.folderId });

        // First create file metadata
        const fileMetadata = {
            name: fileName,
            mimeType: mimeType,
            parents: [window.googleApi.state.folderId]
        };

        // Create the file first
        const fileResponse = await gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });

        const fileId = fileResponse.result.id;
        debugLog('File created with ID:', fileId);

        // Convert blob to base64
        const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });

        // Upload the media content
        const uploadResponse = await gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: {
                uploadType: 'media'
            },
            headers: {
                'Content-Type': mimeType,
                'Authorization': 'Bearer ' + window.googleApi.state.accessToken
            },
            body: base64Data
        });

        debugLog('Upload response:', uploadResponse);

        // Get file details including webViewLink
        const file = await gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, size, webViewLink, webContentLink'
        });

        debugLog('File details:', file.result);

        // Verify upload
        if (!file.result.size || parseInt(file.result.size) === 0) {
            throw new Error('Upload verification failed - file size is 0');
        }

        showStatus('File uploaded successfully');

        // Open the file in a new tab - use webContentLink for direct access
        if (file.result.webContentLink) {
            window.open(file.result.webContentLink, '_blank');
        }

        return file.result;

    } catch (error) {
        debugLog('Upload failed:', error);
        // Clear token if there's an authentication error
        if (error.status === 401) {
            localStorage.removeItem('googleDriveToken');
            window.googleApi.state.accessToken = null;
        }
        showStatus('Upload failed: ' + error.message);
        throw error;
    }
};

// Initialize Google API
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

        await gapi.client.load('drive', 'v3');
        debugLog('Drive API loaded');

        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                    throw (tokenResponse);
                }
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

// Initialize on page load
window.addEventListener('load', async () => {
    debugLog('Page loaded, initializing Google API');
    try {
        await window.initGoogleApi();
    } catch (error) {
        debugLog('Failed to initialize Google API on load:', error);
    }
});

debugLog('Drive upload script loaded successfully');
