async function uploadToDrive(imageBlob) {
    try {
        const formData = new FormData();
        formData.append('file', imageBlob);

        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        alert('Photo uploaded successfully!');
        return result;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
