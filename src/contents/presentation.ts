type Social = {
  label: string;
  link: string;
};

type Presentation = {
  mail: string;
  title: string;
  socials: Social[];
};

const presentation: Presentation = {
  mail: "me@yusoofsh.id",
  title: "Hi, I’m Yusoof 👋",
  socials: [
    {
      label: "Twiiter",
      link: "https://twitter.com/yusoofsh",
    },
    {
      label: "Github",
      link: "https://github.com/yusoofsh",
    },
  ],
};

export default presentation;
