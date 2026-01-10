const gm = require('gm');

gm('/Users/elijahakpan/Desktop/start_up/backend/chapter 5.pdf[0]') // or any image on your Mac
  .identify((err, data) => {
    if (err) {
      console.error("❌ GM Error:", err);
    } else {
      console.log("✅ GM is working!");
      console.log(data);
    }
  });
