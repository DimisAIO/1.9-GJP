let gjp;
const gdps = "https://gdps.dimisaio.be/database";

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { inspect } = require("util");
require("dotenv").config();

const app = express();
const PORT = 3000;

function encodeGJP(password) {
  var crypto = require('crypto')
  var shasum = crypto.createHash('sha1')
  shasum.update(password+"mI29fmAnxgTs")
  return shasum.digest('hex');
}

const debug = process.env.debug == "true" ? true : false;

if (fs.existsSync('new')) {
  fs.unlinkSync('new');
  var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  require('child_process').exec(start + ' ' + "http://localhost:3000");
}

if(process.env.gjp) {
  gjp = process.env.gjp;
} else if(process.env.password) {
  gjp = encodeGJP(process.env.password);
  fs.writeFileSync("./.env", "gjp=" + gjp);
} else {
  gjp = "null";
  console.log("You need to (refresh) login in order to use DindeGDPS 1.9!\nLogin: Gear Icon => Account\nRefresh: Gear Icon => Account => More => Refresh Login");
}

app.use(express.json({limit: '64mb'}));
app.use(express.urlencoded({ limit: '64mb', extended: true }));

app.get('*', function(req, res) {
  res.redirect('https://gdps.dimisaio.be/19.html');
});

app.post('*', async (req, res) => {
    try {
        const path = req.path;
        const postBody = req.body;

        // Check if accountID is present in the post body
        if (postBody.accountID) {
            // Add the 'gjp' option to the post body
            postBody.gjp2 = gjp;
        }
        if (path.endsWith("loginGJAccount.php")) {
            postBody.gjp2 = encodeGJP(postBody.password);
        }

        if(debug) console.log(path + "\n\n" + inspect(req.body,false,null));

        // Forward the modified request to another server via axios
        const response = await axios.post(`${gdps}${path}`, postBody, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': ''
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
        res.status(200).send(`${response.data}`);
    } catch (error) {
        // Handle any errors
        console.error('Error:', error);
        res.status(200).send('-1');
    }
});

app.listen(PORT, () => {
    console.log(`DindeGDPS compatibility server started!`);
});
