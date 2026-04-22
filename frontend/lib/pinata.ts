import axios from 'axios';

export const uploadToIPFS = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
    },
  });
  
  return res.data.IpfsHash; // Ye wo CID hai jo hum blockchain par store karein ge [cite: 97, 98]
};