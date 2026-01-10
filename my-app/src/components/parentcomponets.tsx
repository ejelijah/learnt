import React from 'react';
import InputField from './InputField';
import Profile from './Profile';


const ParentComponent = () => {
    const [pic, setPic] = React.useState<File | null>(null);
  
    return (
      <>
        <InputField onFileSelect={setPic} />
      </>
    );
  };

  
