// Gateway remains verify_jwt=false for asymmetric JWT compatibility.
// The handler verifies Auth.getUser plus the DB's active account and session.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createAccountHandler} from './handler.js';
Deno.serve(createAccountHandler({createClient,env:(name:string)=>Deno.env.get(name)}));
