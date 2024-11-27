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

        // Initialize token client
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            prompt: 'consent'
        });

        window.googleApi.state.tokenClient = tokenClient;
        window.googleApi.state.gapiInited = true;
        
        console.log('Google API initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        return false;
    }
};

// Upload to Google Drive
window.uploadToGoogleDrive = async function(blob, type) {
    try {
        // Ensure API is initialized
        if (!window.googleApi.state.gapiInited) {
            await window.initGoogleApi();
        }

        showStatus('Starting upload...');

        // Get token
        const tokenResponse = await new Promise((resolve, reject) => {
            const tokenClient = window.googleApi.state.tokenClient;
            
            if (!tokenClient) {
                reject(new Error('Token client not initialized'));
                return;
            }

            // Request token without setting callback property
            tokenClient.requestAccessToken((response) => {
                if (response.error !== undefined) {
                    reject(response.error);
                } else {
                    resolve(response);
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
window.addEventListener('load', async () => {
    try {
        await window.initGoogleApi();
        console.log('Google API initialized on page load');
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
    }
});

console.log('Drive upload script loaded successfully');
