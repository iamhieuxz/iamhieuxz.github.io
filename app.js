// overlay

  TweenMax.to('.overlay h1',2 , {
    opacity : 0,
    y : -60,
    ease : Expo.easeInOut
  })
  TweenMax.to('.overlay',2 , {
    delay : 1,
    top : "-100%",
    ease : Expo.easeInOut
  })

// navSilde animation 
const navSlide = ()=> {
     const burger = document.querySelector('.burger');
     const nav = document.querySelector('.nav-link');
    const navLink = document.querySelectorAll('.nav-link li')

     burger.addEventListener('click', () => {
        // Toggle Nav
        
          nav.classList.toggle('nav-active');

          // animation 
          navLink.forEach((link,index) => {
              if(link.style.animation) {
                link.style.animation = '';
              }else {
            link.style.animation = `navLinkFade 0.5s ease forwards ${index /7 +.7}s`;
        }
        });
          // animation burger 

          burger.classList.toggle('toggle');

      });

}

navSlide();

// Typescrip

var typed = new Typed(".type", {
  strings: [
    "Hieu",
    "a Web Designer",
    "a Web Developer",
    "a Creator"
  ],
  typeSpeed : 50,
  backSpeed : 50, 
  loop:true
});