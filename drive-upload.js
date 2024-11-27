// Remove all config declarations and use the global config
window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false
    }
};

window.initGoogleApi = async function() {
    try {
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });

        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
        });

        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            callback: '', // Will be set during upload
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

// Upload function
window.uploadToGoogleDrive = async function(blob, type) {
    try {
        if (!window.googleApi.state.gapiInited || !window.googleApi.state.gisInited) {
            throw new Error('Google API not initialized');
        }

        showStatus('Starting upload...');

        // Handle authentication
        if (!window.googleApi.state.tokenClient) {
            throw new Error('Token client not initialized');
        }

        // Request token
        await new Promise((resolve, reject) => {
            window.googleApi.state.tokenClient.callback = (resp) => {
                if (resp.error) {
                    reject(resp);
                } else {
                    resolve(resp);
                }
            };
            window.googleApi.state.tokenClient.requestAccessToken({prompt: 'consent'});
        });

        // Prepare file metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Upload to Drive
        const response = await gapi.client.drive.files.create({
            resource: {
                name: fileName,
                mimeType: type === 'image' ? 'image/jpeg' : 'video/webm',
            },
            media: {
                mimeType: type === 'image' ? 'image/jpeg' : 'video/webm',
                body: base64Data
            },
            fields: 'id,webViewLink'
        });

        console.log('File uploaded successfully:', response.result.webViewLink);
        showStatus('Upload successful!');
        return response.result;

    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Upload failed. Please try again.');
        throw error;
    }
};

// Log when the script loads
console.log('Drive upload script loaded successfully');
