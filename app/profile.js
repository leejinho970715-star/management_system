export function profileKey(role,district){
 return role==='district'?`${role}:${district}`:role;
}

export function profilePhoto(state,key){
 const photo=state.profilePhotos?.[key];
 return typeof photo==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)?photo:'';
}

export async function prepareProfilePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPG, PNG, WEBP 사진을 선택하세요.');
 if(file.size>5*1024*1024)throw Error('사진은 5MB 이하로 선택하세요.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  try{await image.decode()}catch{throw Error('사진을 읽을 수 없습니다. 다른 사진을 선택하세요.')}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d');
  const side=Math.min(image.naturalWidth,image.naturalHeight);
  context.fillStyle='#ffffff';context.fillRect(0,0,256,256);
  context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
  return canvas.toDataURL('image/jpeg',0.85);
 }finally{URL.revokeObjectURL(url)}
}
