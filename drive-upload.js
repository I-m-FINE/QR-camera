window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false,
        accessToken: null
    }
};

window.initGoogleApi = async function() {
    try {
        // First load the gapi client
        await new Promise((resolve) => {
            gapi.load('client', {
                callback: resolve,
                onerror: () => console.error('Error loading GAPI client'),
                timeout: 5000,
                ontimeout: () => console.error('Timeout loading GAPI client')
            });
        });

        // Initialize the client
        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
        });

        // Load the Drive API
        await gapi.client.load('drive', 'v3');

        // Initialize token client
        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            prompt: 'consent',
            callback: (resp) => {
                if (resp.error !== undefined) {
                    console.error('Token error:', resp.error);
                }
            }
        });

        window.googleApi.state.gapiInited = true;
        window.googleApi.state.gisInited = true;
        
        console.log('Google API initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        return false;
    }
};

window.uploadToGoogleDrive = async function(blob, type) {
    try {
        if (!window.googleApi.state.gapiInited) {
            await window.initGoogleApi();
        }

        showStatus('Starting upload...');

        // Get token
        const tokenResponse = await new Promise((resolve, reject) => {
            if (!window.googleApi.state.tokenClient) {
                reject(new Error('Token client not initialized'));
                return;
            }

            window.googleApi.state.tokenClient.requestAccessToken({
                callback: (response) => {
                    if (response.error !== undefined) {
                        reject(response.error);
                    } else {
                        resolve(response);
                    }
                }
            });
        });

        // Set the token
        gapi.client.setToken(tokenResponse);

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
window.addEventListener('load', () => {
    window.initGoogleApi()
        .then(() => console.log('Google API initialized on page load'))
        .catch(error => console.error('Failed to initialize Google API:', error));
});

console.log('Drive upload script loaded successfully');
