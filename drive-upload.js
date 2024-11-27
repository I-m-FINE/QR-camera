// Create a namespace for Google API configuration
window.googleApi = {
    config: {
        API_KEY: 'YOUR_API_KEY',
        CLIENT_ID: 'YOUR_CLIENT_ID',
        DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        SCOPES: 'https://www.googleapis.com/auth/drive.file'
    },
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false
    }
};

// Initialize Google API
window.initGoogleApi = async function() {
    try {
        // Load the API client
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });

        // Initialize the client
        await gapi.client.init({
            apiKey: window.googleApi.config.API_KEY,
            discoveryDocs: [window.googleApi.config.DISCOVERY_DOC],
        });

        // Initialize token client
        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApi.config.CLIENT_ID,
            scope: window.googleApi.config.SCOPES,
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
    if (!window.googleApi.state.gapiInited || !window.googleApi.state.gisInited) {
        throw new Error('Google API not initialized');
    }

    try {
        showStatus('Starting upload...');

        // Handle authentication
        if (!gapi.client.getToken()) {
            await new Promise((resolve, reject) => {
                window.googleApi.state.tokenClient.callback = (resp) => {
                    if (resp.error) {
                        reject(resp);
                    } else {
                        resolve(resp);
                    }
                };
                window.googleApi.state.tokenClient.requestAccessToken();
            });
        }

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
