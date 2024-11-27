window.googleApi = {
    state: {
        tokenClient: null,
        gapiInited: false,
        gisInited: false,
        accessToken: null
    }
};

window.initGoogleApi = function() {
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: window.googleApiConfig.API_KEY,
                    discoveryDocs: [window.googleApiConfig.DISCOVERY_DOC],
                });

                await gapi.client.load('drive', 'v3');

                if (!window.googleApi.state.tokenClient) {
                    window.googleApi.state.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: window.googleApiConfig.CLIENT_ID,
                        scope: window.googleApiConfig.SCOPES,
                        prompt: 'consent'
                    });
                }

                window.googleApi.state.gapiInited = true;
                window.googleApi.state.gisInited = true;
                
                console.log('Google API initialized successfully');
                resolve(true);
            } catch (error) {
                console.error('Failed to initialize Google API:', error);
                reject(error);
            }
        });
    });
};

window.uploadToGoogleDrive = async function(blob, type) {
    try {
        if (!window.googleApi.state.gapiInited || !window.googleApi.state.tokenClient === null) {
            await window.initGoogleApi();
        }

        showStatus('Starting upload...');

        const token = await new Promise((resolve, reject) => {
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

            window.googleApi.state.tokenClient.requestAccessToken();
        });

        gapi.client.setToken(token);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${type}_${timestamp}.${type === 'image' ? 'jpg' : 'webm'}`;
        const mimeType = type === 'image' ? 'image/jpeg' : 'video/webm';

        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const response = await gapi.client.drive.files.create({
            resource: { name: fileName, mimeType },
            media: { mimeType, body: base64Data },
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

document.addEventListener('DOMContentLoaded', () => {
    window.initGoogleApi()
        .then(() => console.log('Google API initialized on page load'))
        .catch(error => console.error('Failed to initialize Google API:', error));
});

console.log('Drive upload script loaded successfully');
