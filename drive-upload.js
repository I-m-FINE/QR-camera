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
        // First, load the client
        await new Promise((resolve) => {
            gapi.load('client:auth2', resolve);
        });

        // Initialize the client
        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            clientId: window.googleApiConfig.CLIENT_ID,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
            scope: window.googleApiConfig.SCOPES
        });

        // Initialize token client
        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            callback: '', // Will be set later
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

        // Get auth instance
        const authInstance = gapi.auth2.getAuthInstance();
        
        // Check if user is signed in
        if (!authInstance.isSignedIn.get()) {
            // Request authentication
            await new Promise((resolve, reject) => {
                try {
                    if (!window.googleApi.state.tokenClient) {
                        reject(new Error('Token client not initialized'));
                        return;
                    }

                    window.googleApi.state.tokenClient.callback = (response) => {
                        if (response.error) {
                            reject(response);
                        } else {
                            resolve(response);
                        }
                    };

                    window.googleApi.state.tokenClient.requestAccessToken({
                        prompt: 'consent'
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }

        // Now proceed with upload
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Create file metadata
        const metadata = {
            name: fileName,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/webm',
        };

        // Upload file
        const response = await gapi.client.drive.files.create({
            resource: metadata,
            media: {
                mimeType: metadata.mimeType,
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

// Log when the script loads
console.log('Drive upload script loaded successfully');
