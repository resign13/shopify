// Paired *_test fixture: submit/withdraw/re-submit using real buyer controls.
async page=>{
  const base=new URL(page.url()).origin;if(base!=='http://127.0.0.1:5397')throw new Error('Isolated storefront cancellation fixture required');
  let checks=0;const check=(ok,message)=>{if(!ok)throw new Error(message);checks++;};
  page.removeAllListeners('dialog');page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+'/orders');
  await Promise.race([page.getByPlaceholder('Email',{exact:true}).waitFor(),page.locator('.account-order-item').first().waitFor()]);
  if(new URL(page.url()).pathname==='/login'){
    await page.getByPlaceholder('Email',{exact:true}).fill('buyer@gingtto.test');
    await page.getByPlaceholder('Password',{exact:true}).fill('Fixture-Only');
    await page.getByRole('button',{name:'Login to Continue',exact:true}).click();
    await page.waitForURL(url=>url.pathname!=='/login');await page.goto(base+'/orders');
  }
  const row=page.locator('.account-order-item').filter({hasText:'GT202609180001'});
  await row.getByRole('button',{name:'Request cancellation',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Request cancellation',exact:true});
  check(await dialog.getByRole('button',{name:'Submit request',exact:true}).isDisabled(),'Empty cancellation reason accepted');
  await dialog.getByRole('textbox',{name:'Cancellation reason',exact:true}).fill('Customer cancellation browser withdraw');
  let response=page.waitForResponse(r=>r.url().endsWith('/api/store/orders/1/cancellation-requests')&&r.request().method()==='POST');
  await dialog.getByRole('button',{name:'Submit request',exact:true}).click();check((await response).status()===200,'Buyer cancellation request failed');
  await row.getByText('Cancellation pending review',{exact:true}).waitFor();
  check(await row.getByRole('button',{name:'Cancel Order',exact:true}).count()===0,'Paid direct cancel still offered');
  check(await row.getByText('Paid',{exact:true}).isVisible(),'Submitting a request changed business state');
  await row.getByRole('button',{name:'Withdraw request',exact:true}).click();
  await row.getByText('Cancellation request withdrawn',{exact:true}).waitFor();
  check(await row.getByRole('button',{name:'Request cancellation',exact:true}).isVisible(),'Withdrawal did not allow re-application');
  await row.getByRole('button',{name:'Request cancellation',exact:true}).click();
  await dialog.getByRole('textbox',{name:'Cancellation reason',exact:true}).fill('Customer cancellation browser review');
  response=page.waitForResponse(r=>r.url().endsWith('/api/store/orders/1/cancellation-requests')&&r.request().method()==='POST');
  await dialog.getByRole('button',{name:'Submit request',exact:true}).click();const result=await response;
  const item=(await result.json()).item;check(result.status()===200,'Second buyer request failed');
  check(!('reviewerName'in item)&&!('requesterName'in item),'Internal actor metadata leaked');
  await row.getByText('Cancellation pending review',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Cancellation UI overflowed mobile viewport');
  await page.screenshot({path:'output/playwright/store-cancellation-pending.png',animations:'disabled',fullPage:true});
  return {passed:true,checks,requestId:item.id,orderId:item.orderId,storeRequest:true,withdraw:true,paidNotDirect:true,mobile:true};
}
