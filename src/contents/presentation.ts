interface Social {
  label: string;
  link: string;
}

interface Presentation {
  mail: string;
  socials: Social[];
  title: string;
}

const presentation: Presentation = {
  mail: "me@yusoofsh.id",
  socials: [
    // {
    //   label: "Twiiter",
    //   link: "https://twitter.com/yusoofsh",
    // },
    // {
    //   label: "Github",
    //   link: "https://github.com/yusoofsh",
    // },
  ],
  title: "Hi, I’m Yusoof 👋",
};

export default presentation;
