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
        await new Promise((resolve, reject) => {
            gapi.load('client:auth2', {
                callback: resolve,
                onerror: () => reject('Failed to load GAPI client'),
                timeout: 5000,
                ontimeout: () => reject('GAPI client load timeout')
            });
        });

        await gapi.client.init({
            apiKey: window.googleApiConfig.API_KEY,
            clientId: window.googleApiConfig.CLIENT_ID,
            discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
            scope: window.googleApiConfig.SCOPES
        });

        window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: window.googleApiConfig.CLIENT_ID,
            scope: window.googleApiConfig.SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    window.googleApi.state.accessToken = tokenResponse.access_token;
                }
            }
        });

        window.googleApi.state.gapiInited = true;
        window.googleApi.state.gisInited = true;
        
        console.log('Google API initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        window.googleApi.state.gapiInited = false;
        window.googleApi.state.gisInited = false;
        return false;
    }
};

window.uploadToGoogleDrive = async function(blob, type) {
    try {
        if (!window.googleApi.state.gapiInited || !window.googleApi.state.gisInited) {
            await window.initGoogleApi();
        }

        showStatus('Starting upload...');

        if (!window.googleApi.state.accessToken) {
            await new Promise((resolve, reject) => {
                try {
                    window.googleApi.state.tokenClient.callback = (response) => {
                        if (response.error) {
                            reject(response);
                        } else {
                            window.googleApi.state.accessToken = response.access_token;
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

        gapi.client.setToken({
            access_token: window.googleApi.state.accessToken
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.initGoogleApi();
    } catch (error) {
        console.error('Failed to initialize Google API on load:', error);
    }
});

console.log('Drive upload script loaded successfully');
