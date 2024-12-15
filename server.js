const { google } = require('googleapis');
const express = require('express');
const app = express();

// Initialize with your service account credentials
const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.file']
});

app.post('/get-token', async (req, res) => {
    try {
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        res.json({ access_token: token.token });
    } catch (error) {
        console.error('Error getting token:', error);
        res.status(500).json({ error: 'Failed to get access token' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000')); 