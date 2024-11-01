let gjp;
const gdps = "https://dindegmdps.us.to/database";
const name = "DindeGDPS";

const express = require('express');
const axios = require('axios');
const base64 = require('base64-js');
const fs = require('fs');
const { inspect } = require("util");
require("dotenv").config();

const app = express();
const PORT = 3000;

  function xorCipher(string, key) {
    return [...string]
      .map((char, index) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(index % key.length)))
      .join('');
  }
  
function encodeGJP(password) {
  const encoded = xorCipher(password, '37526');
  const encodedBase64 = base64.fromByteArray(Buffer.from(encoded));
  const modifiedBase64 = encodedBase64.replace(/\+/g, '-').replace(/\//g, '_');
  return modifiedBase64;
}

const debug = process.env.debug == "true" ? true : false;

if(process.env.gjp) {
  gjp = process.env.gjp;
} else if(process.env.password) {
  gjp = encodeGJP(process.env.password);
  fs.writeFileSync("./.env", "gjp=" + gjp);
} else {
  gjp = "null";
  console.log("You need to (refresh) login in order to use " + name + " 1.9!\nLogin: Gear Icon => Account\nRefresh: Gear Icon => Account => More => Refresh Login");
}

app.use(express.json({limit: '64mb'}));
app.use(express.urlencoded({ limit: '64mb', extended: true }));

app.post('*', async (req, res) => {
    try {
        const path = req.path;
        const postBody = req.body;

        if(debug) console.log(path + "\n\n" + inspect(req.body,false,null));

        // Check if accountID is present in the post body
        if (postBody.accountID) {
            // Add the 'gjp' option to the post body
            postBody.gjp = gjp;
        }

        // Forward the modified request to another server via axios
        const response = await axios.post(`${gdps}${path}`, postBody, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            validateStatus: () => true // Make all status codes valid
        });

        // Return the response from the other server
        if(debug) console.log(response.data);
        
        const check = "" + response.data;

        // save it like this DUH
        if(path.endsWith("loginGJAccount.php") && !check.startsWith("-")) {
          gjp = encodeGJP(req.body.password);
          fs.writeFileSync("./.env", "gjp=" + gjp);
          console.log(`Logged in as ${postBody.userName}!`);
        }
        res.status(200);
        res.send(`${response.data}`);
    } catch (error) {
        // Handle any errors
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`QuoicouGJP is running on port ${PORT}!`);    
});
