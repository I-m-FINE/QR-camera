window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false
    }
};

window.initGoogleApi = async function() {
    try {
        await new Promise((resolve, reject) => {
            gapi.load('client', {
                callback: resolve,
                onerror: () => reject('GAPI client failed to load'),
                timeout: 5000, // 5 seconds
                ontimeout: () => reject('GAPI client load timeout')
            });
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

window.uploadToGoogleDrive = async function(blob, type) {
    try {
        if (!window.googleApi.state.gapiInited || !window.googleApi.state.gisInited) {
            throw new Error('Google API not initialized');
        }

        showStatus('Starting upload...');

        await new Promise((resolve, reject) => {
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
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;

        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

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
        showStatus('Upload failed: ' + error.message);
        throw error;
    }
};

// Log when the script loads
console.log('Drive upload script loaded successfully');
