# Consumer APP

``` javascript
  // TODO: able to get the image/screenshot
  // Add in index.html
//  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

// Add in js file
    // function sendScreenshotToIframe() {
    //   html2canvas(document.body).then(canvas => {
    //     const imageData = canvas.toDataURL("image/png");
    //     const iframe = document.getElementById("myIframe");
    //     iframe.contentWindow.postMessage({
    //       type: 'SCREENSHOT',
    //       image: imageData
    //     }, '*'); // Replace '*' with exact origin in production
    //   });
    // }
    // sendScreenshotToIframe()

    window.addEventListener("message", function(event) {
      // Verify sender origin for security
      // if (event.origin !== 'http://localhost:5173') return;

      if (event.data.action === "REQUEST_HTML") {
        // Send the HTML back to the iframe
        event.source.postMessage(
          {
            html: document.body.innerText
          },
          "*"
        ); // Or specify exact target origin
      }
    });
    

<iframe
          id="myIframe"
          src="http://localhost:5173/"
          style={{
            position: "absolute",
            bottom: 0,
            right: "50px",
            zIndex: 50,
            border: "none",
            width: "340px",
            background: "white"
          }}
        />
```