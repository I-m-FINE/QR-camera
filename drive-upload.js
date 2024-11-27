// Remove any duplicate declarations and make functions globally available
window.googleApiConfig = {
    CLIENT_ID: 'YOUR_CLIENT_ID',
    API_KEY: 'YOUR_API_KEY',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file'
};

// Initialize variables in a separate namespace
window.googleApiState = {
    tokenClient: null,
    gapiInited: false,
    gisInited: false
};

// Initialize Google API
window.initializeGoogleAPI = async function() {
    try {
        await new Promise((resolve) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: window.googleApiConfig.API_KEY,
                        discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
                    });
                    window.googleApiState.gapiInited = true;
                    resolve();
                } catch (error) {
                    console.error('GAPI init error:', error);
                    throw error;
                }
            });
        });

        window.googleApiState.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            callback: '', // defined at request time
        });
        window.googleApiState.gisInited = true;
        console.log('Google API initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        return false;
    }
};

// Upload function
window.uploadToGoogleDrive = async function(blob, type) {
    if (!window.googleApiState.gapiInited || !window.googleApiState.gisInited) {
        console.error('Google API not initialized');
        throw new Error('Google API not initialized');
    }

    try {
        if (typeof showStatus === 'function') {
            showStatus('Starting upload...');
        }

        // Check if we need to authenticate
        if (!gapi.client.getToken()) {
            await new Promise((resolve, reject) => {
                try {
                    window.googleApiState.tokenClient.callback = async (resp) => {
                        if (resp.error !== undefined) {
                            reject(resp);
                            return;
                        }
                        resolve(resp);
                    };
                    window.googleApiState.tokenClient.requestAccessToken({ prompt: 'consent' });
                } catch (err) {
                    reject(err);
                }
            });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;

        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const metadata = {
            name: fileName,
            mimeType: type === 'image' ? 'image/jpeg' : 'video/webm',
        };

        const response = await gapi.client.drive.files.create({
            resource: metadata,
            media: {
                mimeType: metadata.mimeType,
                body: base64Data
            },
            fields: 'id,webViewLink'
        });

        console.log('File uploaded successfully:', response.result.webViewLink);
        if (typeof showStatus === 'function') {
            showStatus('Upload successful!');
        }
        return response.result;

    } catch (error) {
        console.error('Upload error:', error);
        if (typeof showStatus === 'function') {
            showStatus('Upload failed. Please try again.');
        }
        throw error;
    }
};

// Log when the script loads
console.log('Drive upload script loaded successfully');
