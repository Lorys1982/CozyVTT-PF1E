import { Router, Response } from 'express';
import { authenticated } from '../middleware/compose';
import { AuthenticatedRequest } from '../middleware/rbac';
import { getAonSpell, searchAonSpells } from '../services/pathfinder1eSpellService';
import { getAonFeat, searchAonFeats } from '../services/pathfinder1eFeatService';
import logger from '../utils/logger';

const router = Router();

router.get('/pathfinder1e/spells', authenticated, async (req:AuthenticatedRequest,res:Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const spells = await searchAonSpells(query,Number(req.query.limit) || 20);
    return res.json({spells});
  } catch (error) {
    logger.error('Error searching PF1e spells',{err:error});
    return res.status(502).json({error:'Rules Source Error',message:'Failed to search Archives of Nethys spells'});
  }
});

router.get('/pathfinder1e/spells/:itemName', authenticated, async (req:AuthenticatedRequest,res:Response) => {
  try {
    return res.json({spell:await getAonSpell(req.params.itemName)});
  } catch (error) {
    logger.error('Error loading PF1e spell',{err:error,itemName:req.params.itemName});
    return res.status(502).json({error:'Rules Source Error',message:'Failed to load the Archives of Nethys spell'});
  }
});

router.get('/pathfinder1e/feats',authenticated,async(req:AuthenticatedRequest,res:Response)=>{
  try {
    const query=typeof req.query.q==='string'?req.query.q:'';
    return res.json({feats:await searchAonFeats(query,Number(req.query.limit)||20)});
  } catch(error) {
    logger.error('Error searching PF1e feats',{err:error});
    return res.status(502).json({error:'Rules Source Error',message:'Failed to search Archives of Nethys feats'});
  }
});

router.get('/pathfinder1e/feats/:itemName',authenticated,async(req:AuthenticatedRequest,res:Response)=>{
  try {
    return res.json({feat:await getAonFeat(req.params.itemName)});
  } catch(error) {
    logger.error('Error loading PF1e feat',{err:error,itemName:req.params.itemName});
    return res.status(502).json({error:'Rules Source Error',message:'Failed to load the Archives of Nethys feat'});
  }
});

export default router;
