export function participantId(){
  let id=localStorage.getItem('kotoba-anonymous-participant-v1');
  if(!id){id=crypto.randomUUID();localStorage.setItem('kotoba-anonymous-participant-v1',id);}
  return id;
}
