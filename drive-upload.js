window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false
    }
};

// Initialize Google API
window.initGoogleApi = async function() {
    try {
        // Load GAPI client
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });

        // Initialize GAPI client
        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
        });

        // Load Drive API
        await gapi.client.load('drive', 'v3');

        // Create token client
        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            prompt: 'consent'
        });

        window.googleApi.state.gapiInited = true;
        console.log('Google API initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        return false;
    }
};

// Get access token
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        try {
            const tokenClient = window.googleApi.state.tokenClient;
            if (!tokenClient) {
                throw new Error('Token client not initialized');
            }

            tokenClient.requestAccessToken({
                prompt: '',
                callback: (tokenResponse) => {
                    if (tokenResponse.error !== undefined) {
                        reject(tokenResponse.error);
                    } else {
                        resolve(tokenResponse.access_token);
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Upload to Google Drive
window.uploadToGoogleDrive = async function(blob, type) {
    try {
        // Check initialization
        if (!window.googleApi.state.gapiInited) {
            const initialized = await window.initGoogleApi();
            if (!initialized) {
                throw new Error('Failed to initialize Google API');
            }
        }

        showStatus('Starting upload...');

        // Get access token
        const accessToken = await getAccessToken();
        if (!accessToken) {
            throw new Error('Failed to get access token');
        }

        // Set access token
        gapi.client.setToken({ access_token: accessToken });

        // Prepare file metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;
        const mimeType = type === 'image' ? 'image/jpeg' : 'video/webm';

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(blob);
        });

        // Create the upload request
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

        if (!response.result || !response.result.webViewLink) {
            throw new Error('Upload failed - No response from server');
        }

        console.log('File uploaded successfully:', response.result.webViewLink);
        showStatus('Upload successful!');
        return response.result;

    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Upload failed: ' + error.message);
        throw error;
    }
};

// Initialize on page load
window.addEventListener('load', async () => {
    try {
        await window.initGoogleApi();
        console.log('Google API initialized on page load');
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
    }
});

console.log('Drive upload script loaded successfully');
