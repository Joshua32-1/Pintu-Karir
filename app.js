/* PINTU Karir account and employer flows. Demo persistence uses localStorage. */
(function () {
  document.documentElement.classList.add('pintu-ready');
  const users=JSON.parse(localStorage.pintuUsers||'[]');
  const storedJobs=JSON.parse(localStorage.pintuJobs||'null');
  if(storedJobs&&Array.isArray(storedJobs)&&typeof jobs!=='undefined')jobs.splice(0,jobs.length,...storedJobs);
  let current=JSON.parse(localStorage.pintuSession||'null');
  const save=()=>localStorage.pintuUsers=JSON.stringify(users);
  const authButton=document.createElement('button'); authButton.className='btn ghost'; authButton.textContent=current?'Log out':'Sign in';
  document.querySelector('.top').appendChild(authButton);
  function auth(){
    modalBody.innerHTML='<h2>Welcome to PINTU Karir</h2><div class="chips"><button class="chip active" id="loginTab">Sign in</button><button class="chip" id="signupTab">Sign up</button></div><div id="authForm"></div>'; modal.classList.add('open'); drawLogin();
  }
  function drawLogin(){authForm.innerHTML='<label>Email</label><input id="email" type="email" required><label>Password</label><input id="password" type="password" required><button class="btn red" style="width:100%" onclick="window.pintuLogin()">Sign in</button><button class="link" style="margin-top:12px" onclick="window.pintuForgot()">Forgot password?</button><p class="meta">Accounts are saved only in this browser demo.</p>';loginTab.onclick=drawLogin;signupTab.onclick=drawSignup}
  function drawSignup(){authForm.innerHTML='<label>Full name</label><input id="name"><label>Email</label><input id="email" type="email"><label>Password</label><input id="password" type="password"><label>Confirm password</label><input id="confirmPassword" type="password"><label>Role</label><select id="role" style="width:100%;padding:11px;border:1px solid var(--line);border-radius:9px"><option>Student</option><option>Alumni</option><option>Employer</option></select><button class="btn red" style="width:100%;margin-top:14px" onclick="window.pintuSignup()">Create account</button>';loginTab.onclick=drawLogin;signupTab.onclick=drawSignup}
  window.pintuLogin=function(){const u=users.find(x=>x.email===email.value&&x.password===password.value);if(!u)return alert('Invalid email or password.');current=u;localStorage.pintuSession=JSON.stringify(u);authButton.textContent='Log out';closeModal();alert('Signed in successfully.');};
  window.pintuSignup=function(){if(!name.value||!email.value||password.value.length<6)return alert('Complete all fields. Password must be at least 6 characters.');if(password.value!==confirmPassword.value)return alert('Passwords do not match.');if(users.some(x=>x.email.toLowerCase()===email.value.toLowerCase()))return alert('An account with this email already exists.');const u={id:Date.now(),name:name.value,email:email.value,password:password.value,role:role.value};users.push(u);save();current=u;localStorage.pintuSession=JSON.stringify(u);authButton.textContent='Log out';closeModal();alert('Account created successfully.');};
  window.pintuForgot=function(){const address=prompt('Enter your account email:');if(!address)return;const u=users.find(x=>x.email.toLowerCase()===address.toLowerCase());if(!u)return alert('No account found with that email.');const next=prompt('Enter a new password (at least 6 characters):');if(!next||next.length<6)return alert('Password was not changed.');u.password=next;save();alert('Password reset successfully. You can sign in now.');};
  authButton.onclick=()=>{if(current){current=null;localStorage.removeItem('pintuSession');authButton.textContent='Sign in';alert('You have been logged out.')}else auth()};
  const post=document.createElement('button');post.className='btn red';post.textContent='+ Post a Job';document.querySelector('#home .hero div').appendChild(post);
  post.onclick=()=>{if(!current||!['Alumni','Employer','Admin'].includes(current.role))return alert('Sign in as Alumni or Employer to post a job.');modalBody.innerHTML='<h2>Post a job</h2><label>Job title</label><input id="jt"><label>Company</label><input id="jc"><label>Job type</label><input id="jtype" placeholder="Internship, Full-time..."><label>Location</label><input id="jloc"><label>Salary / pay range</label><input id="jpay"><label>Skills</label><input id="jskills"><label>Description</label><textarea id="jdesc"></textarea><button class="btn red" style="width:100%" onclick="window.pintuPostJob()">Publish job</button>';modal.classList.add('open')};
  window.pintuPostJob=function(){if(!jt.value||!jc.value||!jdesc.value)return alert('Job title, company, and description are required.');jobs.unshift([jt.value,jc.value,jtype.value||'Full-time',jloc.value||'Remote',jpay.value||'Negotiable',jskills.value||'General','#e9424f','New']);localStorage.pintuJobs=JSON.stringify(jobs);closeModal();render();if(typeof runJobSearch==='function')runJobSearch();alert('Your job has been published successfully.')};
  const originalApply=window.openApply;window.openApply=function(){if(!current)return auth();if(current.role!=='Student')return alert('Only student accounts can apply for jobs.');originalApply()};
  // Functional job search/filter query layer for the existing Explore screen.
  function runJobSearch(){
    const query=(document.querySelector('#search')?.value||'').trim().toLowerCase();
    const selected=document.querySelector('#explore .chip.active')?.dataset.type||'All';
    const results=jobs.filter(job=>{
      const searchable=[job[0],job[1],job[2],job[3],job[4],job[5]].join(' ').toLowerCase();
      return (!query||searchable.includes(query))&&(selected==='All'||job[2]===selected);
    });
    const target=document.querySelector('#jobs');
    if(!target)return;
    target.innerHTML=results.length?results.map(job=>jobCard(job,jobs.indexOf(job))).join(''):'<div class="profile"><p class="meta">No jobs found. Try another keyword or clear the filter.</p></div>';
  }
  const searchInput=document.querySelector('#search'), filterButton=document.querySelector('#explore .search .btn');
  if(searchInput)searchInput.oninput=runJobSearch;
  if(filterButton){filterButton.textContent='Search';filterButton.onclick=runJobSearch;}
  document.querySelectorAll('#explore .chip').forEach(chip=>chip.onclick=()=>{
    document.querySelectorAll('#explore .chip').forEach(item=>item.classList.toggle('active',item===chip));
    runJobSearch();
  });
  window.clearJobFilters=function(){if(searchInput)searchInput.value='';document.querySelectorAll('#explore .chip').forEach((item,i)=>item.classList.toggle('active',i===0));runJobSearch()};
  const clearButton=document.createElement('button');clearButton.className='btn ghost';clearButton.textContent='Clear filters';clearButton.onclick=clearJobFilters;if(filterButton)filterButton.parentElement.appendChild(clearButton);
  runJobSearch();
  // Upgrade Explore with an interactive filter drawer and result counter.
  const exploreSearch=document.querySelector('#explore .search');
  const filterPanel=document.createElement('div');
  filterPanel.id='advancedFilters';filterPanel.hidden=true;filterPanel.className='profile';
  filterPanel.innerHTML='<div class="section-head" style="margin-top:0"><h3>Filter opportunities</h3><button class="link" id="closeFilters">Close</button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"><label>Job type<select id="filterType"><option value="All">All types</option><option>Internship</option><option>Part-time</option><option>Full-time</option><option>Freelance</option><option>Tutoring</option></select></label><label>Location<select id="filterLocation"><option value="All">All locations</option><option>Remote</option><option>Singapore</option><option>Hybrid</option><option>On-site</option></select></label><label>Industry / skill<input id="filterKeyword" placeholder="e.g. IT, Marketing"></label></div>';
  exploreSearch.insertAdjacentElement('afterend',filterPanel);
  const count=document.createElement('span');count.id='resultCount';count.className='meta';document.querySelector('#explore .section-head').appendChild(count);
  const oldRun=runJobSearch;
  function advancedSearch(){
    const q=(searchInput?.value||'').toLowerCase().trim(),type=document.querySelector('#filterType')?.value||'All',loc=document.querySelector('#filterLocation')?.value||'All',extra=(document.querySelector('#filterKeyword')?.value||'').toLowerCase().trim();
    const result=jobs.filter(j=>{const text=j.join(' ').toLowerCase();return(!q||text.includes(q))&&(!extra||text.includes(extra))&&(type==='All'||j[2]===type)&&(loc==='All'||text.includes(loc.toLowerCase()))});
    document.querySelector('#jobs').innerHTML=result.length?result.map(j=>jobCard(j,jobs.indexOf(j))).join(''):'<div class="profile"><p class="meta">No opportunities match these filters.</p></div>';
    count.textContent=result.length+' opportunit'+(result.length===1?'y':'ies');
  }
  if(filterButton){filterButton.textContent='Filter';filterButton.onclick=()=>{filterPanel.hidden=!filterPanel.hidden;filterButton.classList.toggle('red',!filterPanel.hidden)}}
  document.querySelector('#closeFilters').onclick=()=>{filterPanel.hidden=true;filterButton.classList.remove('red')};
  ['filterType','filterLocation','filterKeyword'].forEach(id=>document.querySelector('#'+id).addEventListener('input',advancedSearch));
  if(searchInput)searchInput.oninput=advancedSearch;
  document.querySelectorAll('#explore .chip').forEach(chip=>chip.onclick=()=>{document.querySelectorAll('#explore .chip').forEach(x=>x.classList.toggle('active',x===chip));document.querySelector('#filterType').value=chip.dataset.type;advancedSearch()});
  clearButton.onclick=()=>{searchInput.value='';document.querySelector('#filterType').value='All';document.querySelector('#filterLocation').value='All';document.querySelector('#filterKeyword').value='';document.querySelectorAll('#explore .chip').forEach((x,i)=>x.classList.toggle('active',i===0));advancedSearch()};
  advancedSearch();
  // Interactive mentorship requests from the existing alumni cards.
  const mentorshipRequests=JSON.parse(localStorage.pintuMentorships||'[]');
  window.openMentor=function(event){event?.stopPropagation();if(!current)return auth();modalBody.innerHTML='<h2>Request mentorship</h2><p class="meta">Ask an alumnus for guidance and choose a topic.</p><label>Alumni name</label><input id="mentorName" value="'+(event?.target?.closest('.person')?.querySelector('h3')?.textContent||'Alumni')+'" readonly><label>Career topic</label><select id="mentorTopic"><option>Career advice</option><option>CV review</option><option>Interview preparation</option><option>Industry insights</option><option>Internship advice</option><option>Career transition</option></select><label>Message</label><textarea id="mentorMessage" placeholder="Tell them what you would like help with..."></textarea><label>Preferred meeting time</label><input id="mentorTime" type="datetime-local"><button class="btn red" style="width:100%;margin-top:10px" onclick="window.sendMentorshipRequest()">Send request</button>';modal.classList.add('open')};
  window.sendMentorshipRequest=function(){if(!mentorMessage.value.trim()||!mentorTime.value)return alert('Please add a message and preferred meeting time.');mentorshipRequests.push({student:current.name,alumni:mentorName.value,topic:mentorTopic.value,message:mentorMessage.value,time:mentorTime.value,status:'Pending',created:new Date().toISOString()});localStorage.pintuMentorships=JSON.stringify(mentorshipRequests);closeModal();alert('Mentorship request sent successfully.')};
  const mentorSearch=document.querySelector('#mentorship .search input');if(mentorSearch)mentorSearch.oninput=()=>{const q=mentorSearch.value.toLowerCase();document.querySelector('#allAlumni').innerHTML=alumni.filter(a=>a.join(' ').toLowerCase().includes(q)).map(personCard).join('')};
  // Local conversational reply so the chat is interactive even without a remote API.
  window.sendMessage=function(){const input=document.querySelector('#messageInput');if(!input||!input.value.trim()||!activeChat)return;const text=input.value.trim(),now=()=>new Date().toLocaleString();(chats[activeChat]||(chats[activeChat]=[])).push({from:'me',text,time:now()});P.set('pintuMessages',chats);input.value='';renderChat();
    setTimeout(()=>{const lower=text.toLowerCase();let reply='Thanks for reaching out! I would be happy to share what I learned and help where I can.';if(lower.includes('cv')||lower.includes('resume'))reply='Absolutely — I can share a few CV tips. Tailor your summary to the role and highlight measurable results.';else if(lower.includes('interview'))reply='For interviews, prepare two or three clear project stories and connect each one to the role you want.';else if(lower.includes('product'))reply='Product is a great area to explore. Start by learning how user research, prioritisation, and metrics connect.';else if(lower.includes('hello')||lower.includes('hi'))reply='Hi! Great to hear from you. What would you like to learn more about?';chats[activeChat].push({from:'them',text:reply,time:now()});P.set('pintuMessages',chats);renderChat()},700);
  };
  window.addEventListener('storage',()=>{if(typeof renderNetwork==='function')renderNetwork();if(typeof renderMessages==='function')renderMessages();});
})();
