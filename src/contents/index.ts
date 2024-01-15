interface Social {
  label: string;
  link: string;
}

interface Presentation {
  socials: Social[];
  title: string;
}

const presentation: Presentation = {
  socials: [
    {
      label: "Mail",
      link: "mailto:me@yusoofsh.id",
    },
    {
      label: "Twiiter",
      link: "https://twitter.com/yusoofsh",
    },
    {
      label: "Github",
      link: "https://github.com/yusoofsh",
    },
    {
      label: "LinkedIn",
      link: "https://linkedin.com/in/yusoofsh",
    },
  ],
  title: "Hi, I’m Yusoof 👋",
};

export default presentation;
