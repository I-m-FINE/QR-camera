// Google API configuration
const CLIENT_ID = 'http://997301043207-c9bs9jdbrhkg624qgf76qa9btfs8e0qj.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCiSB89a73LV0jvQJca2B6lx2slwgNFX6I';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

async function initializeGoogleAPI() {
    await new Promise((resolve) => {
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            resolve();
        });
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
    });
    gisInited = true;
}

async function uploadToGoogleDrive(blob, type) {
    try {
        showStatus('Starting upload...');

        // Check if we need to authenticate
        if (!gapi.client.getToken()) {
            // Request authentication
            await new Promise((resolve, reject) => {
                try {
                    tokenClient.callback = async (resp) => {
                        if (resp.error !== undefined) {
                            reject(resp);
                            return;
                        }
                        resolve(resp);
                    };
                    tokenClient.requestAccessToken({ prompt: 'consent' });
                } catch (err) {
                    reject(err);
                }
            });
        }

        // Proceed with upload
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
        showStatus('Upload successful!');
        return response.result;

    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Upload failed. Please try again.');
        throw error;
    }
}
