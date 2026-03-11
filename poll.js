async function poll() {
  const url = 'https://api.replicate.com/v1/predictions/7k3fax3xmnrmt0cwvqas8tyx2m';
  while(true) {
    const response = await fetch(url, {
      headers: {
        "Authorization": "Bearer REDACTED",
      }
    });
    const data = await response.json();
    if (data.status === 'succeeded') {
      console.log('OUTPUT_URL:', data.output);
      break;
    } else if (data.status === 'failed') {
      console.error('FAILED:', data.error);
      break;
    }
    console.log(data.status);
    await new Promise(r => setTimeout(r, 2000));
  }
}
poll();
