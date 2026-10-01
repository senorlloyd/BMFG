const Carousel = document.getElementById("Gallery_Main");

var Image_Type = "4:3";
var Images = [];
var n = 0;
var imageCount = 4;

for (let i = 0; i < imageCount; i++) { /TODO: Actually automate this. Im too lazy to do that rn/
    Images.push(`IMG_${i}.jpg`);
}

console.log(Images[0]);

function DisplayImage() {
    Carousel.innerHTML = `
    <img src = "Assets/Gallery/Carousel/${Image_Type}/${Images[n]}" alt = "Img.heic" class = "Carousel_Image">
    `

    n++;
    if (n > imageCount - 1) {n=0;}
}

DisplayImage();
setInterval(DisplayImage, 5000)
