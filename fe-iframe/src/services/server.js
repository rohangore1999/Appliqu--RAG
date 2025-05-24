import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getImageDetails = async (compressedImage) => {
  console.log("compressedImage >>>", compressedImage);

  try {
    const response = await api.post("/describe-image", {
      image_url: compressedImage,
    });

    return response?.data?.description;
  } catch (error) {
    console.error(error);
  }
};

export const chat = async (reqBody) => {
  console.log({ reqBody });
  try {
    const response = await api.post("/chat", {
      user_input: reqBody,
    });

    return response?.data?.response;
  } catch (error) {
    console.error(error);
  }
};
